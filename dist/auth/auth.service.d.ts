import { OtpService } from '../otp/otp.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { KeycloakTokenResponse } from '../common/interfaces/keycloak.interface';
export declare class AuthService {
    private readonly otpService;
    private readonly keycloakService;
    private readonly logger;
    constructor(otpService: OtpService, keycloakService: KeycloakService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        expiresAt: Date;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        message: string;
        userId: string;
    }>;
    login(loginDto: LoginDto): Promise<KeycloakTokenResponse>;
}
