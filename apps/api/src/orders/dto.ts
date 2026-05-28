import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
}

export class ApplyPromoDto {
  @IsString()
  code!: string;
}
