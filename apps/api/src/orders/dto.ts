import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type PaymentMethod = 'CARD' | 'PAYPAL' | 'COD';
const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'PAYPAL', 'COD'];

export class CheckoutDto {
  @ApiPropertyOptional({ description: 'Address id to ship to.' })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsEnum(PAYMENT_METHODS)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Loyalty points to redeem (1 point = 1¢ store credit).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  redeemPoints?: number;
}

export class ApplyPromoDto {
  @IsString()
  code!: string;
}

export class RequestReturnDto {
  @ApiProperty({ description: 'Why the customer is returning the order.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
