import { KeycloakService } from '../keycloak/keycloak.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { KeycloakUser } from '../common/interfaces/keycloak.interface';
export declare class UsersService {
    private readonly keycloakService;
    private readonly logger;
    constructor(keycloakService: KeycloakService);
    getUserById(userId: string): Promise<KeycloakUser>;
    getUsers(query: GetUsersQueryDto): Promise<{
        users: KeycloakUser[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<KeycloakUser>;
    disableUser(userId: string): Promise<{
        message: string;
    }>;
    deleteUser(userId: string): Promise<{
        message: string;
    }>;
}
