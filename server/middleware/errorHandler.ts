import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { DrizzleError } from 'drizzle-orm';

// Create a context-specific logger
const errorLogger = logger.child({ context: 'ErrorHandler' });

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDatabaseError = (err: DrizzleError) => {
  const message = err.message || 'Database error';
  if (message.includes('unique')) {
    return new AppError('Cette entrée existe déjà', 400);
  } else if (message.includes('foreign key')) {
    return new AppError('Référence invalide', 400);
  } else if (message.includes('not null')) {
    return new AppError('Données obligatoires manquantes', 400);
  }
  errorLogger.error('Unhandled database error:', err);
  return new AppError('Erreur de base de données', 500);
};

const handleValidationError = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Données invalides. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleAuthenticationError = (err: any) => {
  return new AppError('Non authentifié. Veuillez vous connecter.', 401);
};

const sendErrorDev = (err: AppError, req: Request, res: Response) => {
  // Always ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  // Log error details
  errorLogger.error('Development error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    status: err.status,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err: AppError, req: Request, res: Response) => {
  // Always ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  // Log error details
  errorLogger.error('Production error:', {
    message: err.message,
    path: req.path,
    method: req.method,
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  return res.status(500).json({
    status: 'error',
    message: 'Une erreur est survenue'
  });
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure response hasn't been sent yet
  if (res.headersSent) {
    return next(err);
  }

  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  if (err instanceof DrizzleError) {
    err = handleDatabaseError(err);
  } else if (err.name === 'ValidationError') {
    err = handleValidationError(err);
  } else if (err.name === 'UnauthorizedError' || err.status === 401 || err.message?.includes('authenticated')) {
    err = handleAuthenticationError(err);
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    sendErrorProd(err, req, res);
  }
};

// Middleware to catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};