import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(`Error in API route: ${req.method} ${req.path}`, error);
      next(error);
    }
  };
};

export default asyncHandler;