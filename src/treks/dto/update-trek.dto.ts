import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTrekDto } from './create-trek.dto';

// organizerType shouldn't change after creation — omit it from the patchable fields.
// Uses @nestjs/swagger's PartialType/OmitType (not @nestjs/mapped-types') because
// only the swagger versions carry ApiProperty metadata through to the derived
// class — @nestjs/mapped-types' versions preserve class-validator decorators
// for request validation but silently drop Swagger schema info, which is why
// this endpoint's PATCH body was showing as an empty object in the OpenAPI spec.
export class UpdateTrekDto extends PartialType(OmitType(CreateTrekDto, ['organizerType'] as const)) {}
