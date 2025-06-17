export declare class ApiResponseDto<T> {
    success: boolean;
    message: string;
    data?: T;
    errorCode?: string;
}
export declare class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
