import {Entity, Column, PrimaryGeneratedColumn} from 'typeorm'

@Entity({name:'notifications'})

export class Notification {
    @Column({type:'uuid'})
    id: string;
    @PrimaryGeneratedColumn()
    sequence: number;  

    @Column({type:'varchar'})
    title: string;
    @Column({type:'text'})
    description: string;
    @Column({type:'varchar'})
    description_short: string;

    @Column({type:'int',/*length:1*/})
    status: number;
    @Column({type:'timestamp',default:'now()'})
    created_at: string;
    @Column({type:'timestamp', nullable: true,default:'now()'})
    updated_at: string;
    @Column({type:'int'})
    user_created: number;
    @Column({type:'int', nullable: true})
    user_updated: number;

}