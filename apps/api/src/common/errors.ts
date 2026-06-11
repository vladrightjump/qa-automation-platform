import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Standard error message helpers so 404 / 409 strings are consistent across
 * services. The thrown exception types still come from Nest so the HTTP status
 * mapping is unchanged.
 */
export function notFoundFor(entity: string, id: string | number): NotFoundException {
  return new NotFoundException(`${entity} ${id} not found`);
}

export function conflictFor(message: string): ConflictException {
  return new ConflictException(message);
}
