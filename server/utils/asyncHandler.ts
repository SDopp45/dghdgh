import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper pour gérer les erreurs asynchrones dans les routes Express
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};