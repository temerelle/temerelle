import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

// The only source of "now", in UTC; callers switch to the business timezone. Injectable so tests can pin the time
@Injectable()
export class ClockService {
  now(): DateTime {
    return DateTime.utc();
  }
}
