export interface Member {
    id: string;
    name: string;
    role: string;
    hourlyRate: number;
    workCapacity: number;
    memo?: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Project {
    id: string;
    name: string;
    type: "開発" | "保守" | "管理" | "その他";
    description?: string | null;
    budget?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Assignment {
    id: string;
    memberId: string;
    projectId: string;
    year: number;
    month: number;
    manMonth: number;
    createdAt: Date;
    member?: Member;
    project?: Project;
}
