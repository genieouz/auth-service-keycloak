import { Model } from 'mongoose';
import { OtpDocument } from './schemas/otp.schema';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class OtpService {
    private otpModel;
    private readonly logger;
    constructor(otpModel: Model<OtpDocument>);
    private generateOtpCode;
    generateOtp(generateOtpDto: GenerateOtpDto): Promise<{
        code: string;
        expiresAt: Date;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<OtpDocument>;
    cleanupExpiredOtp(): Promise<void>;
}
