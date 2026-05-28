import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'prod_widget' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class ReorderCartDto {
  @ApiProperty({ type: [String], description: 'Product ids in the desired order.' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  order!: string[];
}
