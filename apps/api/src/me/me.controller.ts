import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.guard';
import { MeService } from './me.service';
import { SetLocaleDto } from './dto';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Patch('locale')
  setLocale(@CurrentUser() user: AuthedUser, @Body() dto: SetLocaleDto) {
    return this.me.setLocale(user.id, dto.locale);
  }
}
