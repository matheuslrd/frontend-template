export namespace Task {
    export type Status = 'open' | 'done';
    export type Model = { id: number, title: string, status: Status, createdAt: string };
}
