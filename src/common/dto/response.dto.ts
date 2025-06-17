import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indique si la requête a réussi' })
  success: boolean;

  @ApiProperty({ description: 'Message de réponse' })
  message: string;

  @ApiProperty({ description: 'Données de réponse' })
  data?: T;

  @ApiProperty({ description: 'Code d\'erreur en cas d\'échec', required: false })
  errorCode?: string;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ description: 'Nombre total d\'éléments' })
  total: number;

  @ApiProperty({ description: 'Page actuelle' })
  page: number;

  @ApiProperty({ description: 'Nombre d\'éléments par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}