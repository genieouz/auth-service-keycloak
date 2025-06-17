import { Document } from 'mongoose';
export type OtpDocument = Otp & Document;
export declare class Otp {
    identifier: string;
    code: string;
    expiresAt: Date;
    verified: boolean;
    userData: {
        email?: string;
        phone?: string;
        password: string;
        firstName?: string;
        lastName?: string;
    };
}
export declare const OtpSchema: import("mongoose").Schema<Otp, import("mongoose").Model<Otp, any, any, any, Document<unknown, any, Otp> & Otp & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Otp, Document<unknown, {}, import("mongoose").FlatRecord<Otp>> & import("mongoose").FlatRecord<Otp> & {
    _id: import("mongoose").Types.ObjectId;
}>;
