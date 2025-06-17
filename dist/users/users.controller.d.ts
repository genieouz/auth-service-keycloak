import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly logger;
    constructor(usersService: UsersService);
    getUsers(query: GetUsersQueryDto): Promise<{
        success: boolean;
        message: string;
        data: import("../common/interfaces/keycloak.interface").KeycloakUser[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserById(id: string): Promise<{
        success: boolean;
        message: string;
        data: import("../common/interfaces/keycloak.interface").KeycloakUser;
    }>;
    updateUser(id: string, updateUserDto: UpdateUserDto): Promise<{
        success: boolean;
        message: string;
        data: import("../common/interfaces/keycloak.interface").KeycloakUser;
    }>;
    deleteUser(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
