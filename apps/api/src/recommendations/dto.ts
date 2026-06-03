import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// The recently-viewed product IDs travel as a request header
// `X-Recently-Viewed: prod_a,prod_b,...` (the storefront tracks them in
// localStorage; see apps/web/lib/recently-viewed.ts). The DTO is empty —
// validation lives in the service so we can shape header parsing.
export class GetRecommendationsHeadersDto {
  @ApiPropertyOptional({
    description: 'Comma-separated product IDs recently viewed by the user.',
  })
  @IsOptional()
  @IsString()
  'x-recently-viewed'?: string;
}
