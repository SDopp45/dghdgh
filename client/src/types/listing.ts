import { Property } from './property';
import { Portal } from './portal';
import { TargetAudience } from './target-audience';
import { ListingType } from './listing-type';

export interface GeneratedListing {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  seoDescription: string;
  property: Property;
  portal: Portal;
  targetAudience: TargetAudience;
  type: ListingType;
  createdAt: Date;
} 