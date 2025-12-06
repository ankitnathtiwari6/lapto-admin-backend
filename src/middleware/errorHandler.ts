import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: any;
  stack?: string;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error: ErrorResponse = {
    success: false,
    message: err.message || 'Server Error'
  };

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error.message = 'Validation Error';
    error.errors = Object.values(err.errors).map((e: any) => e.message);
  }

  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(err.statusCode || 500).json(error);
};
