import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty()
  @IsString()
  @Matches(/^prod_[a-z0-9_]+$/)
  productId!: string;
}
