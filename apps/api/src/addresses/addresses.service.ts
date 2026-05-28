import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@qa/db';
import type { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressesService {
  list(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    return prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          name: dto.name,
          line1: dto.line1,
          line2: dto.line2 ?? null,
          city: dto.city,
          postalCode: dto.postalCode,
          country: dto.country ?? 'US',
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.ensureOwned(userId, id);
    return prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
          ...(dto.line2 !== undefined ? { line2: dto.line2 } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await prisma.address.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwned(userId: string, id: string) {
    const found = await prisma.address.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Address ${id} not found`);
    if (found.userId !== userId) {
      throw new ForbiddenException();
    }
    return found;
  }
}
