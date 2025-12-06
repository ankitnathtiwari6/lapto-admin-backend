import { Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuthRequest } from "../middleware/auth";
import DeviceType from "../models/DeviceType";
import ServiceType from "../models/ServiceType";

export const generateOrderFromJobDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { jobDetails } = req.body;

    if (!jobDetails || jobDetails.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Job details are required",
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        message: "Gemini API key not configured",
      });
      return;
    }

    // Initialize Google Generative AI with API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Get available device types and service types for context
    const deviceTypes = await DeviceType.find({ isActive: true }).select(
      "name slug"
    );
    const serviceTypes = await ServiceType.find({ isActive: true }).select(
      "name category description"
    );

    // Create context for the AI
    const deviceTypesContext = deviceTypes
      .map((dt) => `${dt.name} (${dt.slug})`)
      .join(", ");
    const serviceTypesContext = serviceTypes
      .map(
        (st) =>
          `${st.name}${st.category ? ` (${st.category})` : ""}${
            st.description ? ` - ${st.description}` : ""
          }`
      )
      .join("\n");

    const prompt = `You are an AI assistant for a repair shop management system. Based on the job details provided, extract and structure the information into a repair order format.

Available Device Types: ${deviceTypesContext}

Available Service Types:
${serviceTypesContext}

Job Details:
${jobDetails}

Please analyze the job details and extract the following information in valid JSON format (ONLY return the JSON, no additional text):

{
  "customerInfo": {
    "name": "Customer name if mentioned, otherwise empty string",
    "phone": "Phone number if mentioned, otherwise empty string",
    "email": "Email if mentioned, otherwise empty string",
    "address": "Address if mentioned, otherwise empty string"
  },
  "device": {
    "deviceType": "Best matching device type from the available list, use the slug value",
    "brand": "Device brand if mentioned, otherwise empty string",
    "model": "Device model if mentioned, otherwise empty string",
    "serialNumber": "Serial number if mentioned, otherwise empty string"
  },
  "problemDescription": "Detailed description of the problem",
  "priority": "low, medium, high, or urgent based on the urgency implied in the job details",
  "suggestedServices": [
    {
      "name": "Service name from available services or custom service name",
      "estimatedCost": 0
    }
  ]
}

Important:
- Match device types and service types from the available lists when possible
- If no customer info is provided, leave those fields empty
- Priority should be "medium" if not clear from context
- Extract all relevant information from the job details
- Return ONLY valid JSON, no markdown code blocks or additional text`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Remove markdown code blocks if present
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      res.status(500).json({
        success: false,
        message:
          "Failed to parse AI response. Please try again or enter details manually.",
      });
      return;
    }

    // Find the actual device type ID based on the slug
    let deviceTypeId = "";
    let deviceTypeName = "";
    if (parsedData.device?.deviceType) {
      const foundDeviceType = deviceTypes.find(
        (dt) =>
          dt.slug === parsedData.device.deviceType ||
          dt.name.toLowerCase() === parsedData.device.deviceType.toLowerCase()
      );
      if (foundDeviceType) {
        deviceTypeId = foundDeviceType._id.toString();
        deviceTypeName = foundDeviceType.name;
      }
    }

    // Match services with actual service types
    const matchedServices = [];
    if (
      parsedData.suggestedServices &&
      Array.isArray(parsedData.suggestedServices)
    ) {
      for (const suggestedService of parsedData.suggestedServices) {
        const foundServiceType = serviceTypes.find(
          (st) => st.name.toLowerCase() === suggestedService.name.toLowerCase()
        );

        if (foundServiceType) {
          matchedServices.push({
            serviceTypeId: foundServiceType._id.toString(),
            serviceTypeName: foundServiceType.name,
            description: foundServiceType.description || "",
            quantity: 1,
            unitPrice: suggestedService.estimatedCost || 0,
            discount: 0,
            taxRate: 18,
            estimatedCost: suggestedService.estimatedCost || 0,
            isCustom: false,
          });
        } else {
          // Add as custom service
          matchedServices.push({
            serviceTypeId: `custom-${Date.now()}-${Math.random()}`,
            serviceTypeName: suggestedService.name,
            description: "",
            quantity: 1,
            unitPrice: suggestedService.estimatedCost || 0,
            discount: 0,
            taxRate: 18,
            estimatedCost: suggestedService.estimatedCost || 0,
            isCustom: true,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        customerInfo: parsedData.customerInfo || {},
        device: {
          deviceTypeId,
          deviceTypeName,
          brand: parsedData.device?.brand || "",
          model: parsedData.device?.model || "",
          serialNumber: parsedData.device?.serialNumber || "",
        },
        problemDescription: parsedData.problemDescription || jobDetails,
        priority: parsedData.priority || "medium",
        services: matchedServices,
      },
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate order from job details",
    });
  }
};
