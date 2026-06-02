import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SUPPORTED_LOCALES } from '@qa/contracts';

// Mutable copy of the readonly tuple for class-validator's @IsIn.
const LOCALES = [...SUPPORTED_LOCALES];

export class SetLocaleDto {
  @ApiProperty({ enum: LOCALES, example: 'de-DE' })
  @IsIn(LOCALES)
  locale!: (typeof SUPPORTED_LOCALES)[number];
}
