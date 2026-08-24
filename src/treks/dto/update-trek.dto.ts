import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTrekDto } from './create-trek.dto';

// organizerType shouldn't change after creation — omit it from the patchable fields.
export class UpdateTrekDto extends PartialType(OmitType(CreateTrekDto, ['organizerType'] as const)) {}
