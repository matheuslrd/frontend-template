export namespace Service {
    export type Message = string;
    export type DefaultResponse<TPayload = undefined, TKey extends string = never> =
        { success: true } & { [Key in TKey]: TPayload };
    export type ExceptionResponse = {
        success: false,
        msg?: Message,
        error?: { name: string, code: string },
    };
}
