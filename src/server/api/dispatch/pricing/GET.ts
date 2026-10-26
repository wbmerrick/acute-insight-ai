import type { Request, Response } from 'express';
import { pricing } from '../../../lib/stripe.js';

/** Public: what a visit costs by acuity. `configured:false` → the UI shows no price and requests are free. */
export default function handler(_req: Request, res: Response) {
  res.json(pricing());
}
