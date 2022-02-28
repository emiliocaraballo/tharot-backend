import { getRepository } from 'typeorm';
import { to } from 'await-to-js';
import bcrypt from 'bcryptjs';

import { IQueryResponse } from 'src/interfaces/repository'
import { UserAdmin } from 'src/database/entity/userAdmin'
import { IUser } from "src/interfaces/user";
import { auth } from 'src/middleware/auth';
import { UserPasswordHistory } from 'src/database/entity/userPasswordHistory';
import { general } from 'src/config/general';
import { mailer } from 'src/config/mail';

class UserRepository{

    public validateUser=async (user: string): Promise<IQueryResponse> => {
        const Query=getRepository(UserAdmin).findOne({select:["email","identification","names","phone","id"],where:{email:user.toLocaleLowerCase()}});
        
        const [errorResponse, response] = await to(Query);
        
        if (!response) {
            return {
                statusCode:404,
                message:'USER_NOT_FOUND'
            }
        }

        return {
            statusCode:200,
            data:response
        }
    }

    public login=async (data: IUser): Promise<IQueryResponse> => {

        const Query=getRepository(UserAdmin).findOne({select:["email","identification","names","phone","id","password"],where:{email:data.username.toLocaleLowerCase()}});
      

        const [errorResponse, response] = await to(Query);
        if (!response) {
            return {
                statusCode:400,
                message:'USER_PASSWORD_VERIFY'
            }
        }

        if(!await this.checkPassword(data.password,response.password)){
            return {
                statusCode:400,
                message:'USER_PASSWORD_VERIFY'
            }
        }

        const user={
            id:response.id,
            names:response.names,
            phone:response.phone,
            identification:response.identification,
            email:response.email,
        }

       const token=await auth.generateToken(user)

        return {
            statusCode:200,
            token:token,
            data:user
        }
    }
    
    public changePassword=async (user: string): Promise<IQueryResponse> => {

        const Query=getRepository(UserAdmin).findOne({select:["email","names","id","sequence"],where:{email:user.toLocaleLowerCase()}});
        const [errorResponse, response] = await to(Query);
        if (!response) {
            return {
                statusCode:404,
                message:'USER_NOT_FOUND'
            }
        }
        // el sequence se usuario
        const sequence=response.sequence;

        const QueryUserPasswordHistory=getRepository(UserPasswordHistory).createQueryBuilder("userPasswordHistory")
        .innerJoin("users_admins","userAdmin","userPasswordHistory.user_admin_sequence=userAdmin.sequence")
        .where("userAdmin.sequence=:sequence",{sequence:sequence})
        .limit(1)
        .orderBy("userPasswordHistory.createdAt","DESC")
        .getMany()
        
        const [errorPassword, responsePassword] = await to(QueryUserPasswordHistory);   
        if(responsePassword.length>0){
            // paso 1 ver si ya expiro y si el estado es 0
            var status:number=responsePassword[0].status;
            var createdAt:string=responsePassword[0].createdAt;
            var minute=general.diff_minute(general.dateNow(),general.dateFormat(createdAt));
            if(minute<=60 && status==0){
                return {
                    statusCode:400,
                    message:'PENDING_REQUEST'
                }
            }
        }
        const result=await this.createPasswordHistory(response);
        if(!result){
            // no se pudo general la solicitud.
            return {
                statusCode:400,
                message:'NOT_REQUEST'
            }
        }

        const data={
            sequence:result,
            userId:sequence
        }
        const token=await auth.generateToken(data,60);
        // se envia al correo.
        mailer.mainChangePassword(response.names,token);
        return {
            statusCode:200
        }
    }


    // general una nueva solicitd para cambio de contraseña
    private createPasswordHistory=async(user:UserAdmin): Promise<boolean | number | undefined> =>{
         
        const userPasswordHistory=new UserPasswordHistory();
        userPasswordHistory.userAdminSequence=user;
        userPasswordHistory.createdAt=general.dateNow();
        userPasswordHistory.updatedAt=general.dateNow();
        userPasswordHistory.userCreated=user.sequence;
        userPasswordHistory.userUpdated=user.sequence;
        userPasswordHistory.userUpdated=user.sequence;
        userPasswordHistory.status=0;
       
        const [errorPassword, response] = await to(getRepository(UserPasswordHistory).save(userPasswordHistory));
        var sequence: boolean | number | undefined=false;
        if(response){
            sequence=response.sequence;
        }
        return sequence;
    }

    // se valida el password si es igual para el hash
    private checkPassword=async (password:string,passwordHash:string): Promise<boolean> => {
        return bcrypt.compare(password,passwordHash);
    }
}
export const userRepository=new UserRepository;