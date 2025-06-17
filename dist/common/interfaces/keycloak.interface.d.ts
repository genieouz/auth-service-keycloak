export interface KeycloakTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    'not-before-policy': number;
    scope: string;
}
export interface KeycloakUser {
    id?: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled: boolean;
    emailVerified?: boolean;
    attributes?: {
        phone?: string[];
        [key: string]: any;
    };
    credentials?: KeycloakCredential[];
}
export interface KeycloakCredential {
    type: string;
    value: string;
    temporary: boolean;
}
export interface KeycloakError {
    error: string;
    error_description: string;
}
