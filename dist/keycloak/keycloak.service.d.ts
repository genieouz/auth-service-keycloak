import { ConfigService } from '@nestjs/config';
import { KeycloakTokenResponse, KeycloakUser } from '../common/interfaces/keycloak.interface';
export declare class KeycloakService {
    private configService;
    private readonly logger;
    private readonly httpClient;
    private readonly keycloakUrl;
    private readonly realm;
    private readonly adminClientId;
    private readonly adminClientSecret;
    private readonly userClientId;
    constructor(configService: ConfigService);
    getAdminToken(): Promise<string>;
    authenticateUser(identifier: string, password: string): Promise<KeycloakTokenResponse>;
    createUser(userData: KeycloakUser): Promise<string>;
    getUserById(userId: string): Promise<KeycloakUser>;
    getUsers(first?: number, max?: number): Promise<KeycloakUser[]>;
    updateUser(userId: string, userData: Partial<KeycloakUser>): Promise<void>;
    disableUser(userId: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
}
