// DTO используется для формирования объекта пользователя,
// который будет отправляться на клиент. Он не содержит приватной информации.
export class UserDto {
    email: string;
    username: string;
    id: string;
    isActivated: boolean;
    balance: number;
    secondaryBalance: number;
    avatar: string;

    constructor(model: any) {
        this.email = model.email;
        this.username = model.username;
        this.id = model._id;
        this.isActivated = model.isActivated;
        this.balance = model.balance;
        this.secondaryBalance = model.secondaryBalance;
        this.avatar = model.avatar;
    }
}