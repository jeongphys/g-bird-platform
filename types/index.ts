// types/index.ts
export interface User {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  isActive: boolean;
  history?: { [semester: string]: "O" | "X" };
  shuttleDiscount: number;
  attendanceScore: number;
  createdAt?: Date;
  isAdmin?: boolean;
  photoURL?: string;
}

export interface Session {
  date: string;
  semester: string;
  validCode: string;
  voteData: { [userId: string]: "attend" | "absent" | "none" };
  attendances: { [userId: string]: AttendanceRecord };
  status: "open" | "closed";
  updatedAt?: string;
}

export interface AttendanceRecord {
  time?: string;
  status?: string;
  ip?: string;
  deviceId?: string;
  warning?: string | null;
}

export interface InventoryItem {
  id: string;
  box: number;
  number: number;
  price: number;
  isSold: boolean;
  soldTo: string | null;
}

export interface Order {
  id: string;
  userName: string;
  items: string[];
  totalPrice: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  rejectReason?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
}

export interface FreeboardPost {
  id: string;
  content: string;
  author: string;
  color: number;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
  createdBy: string;
}

export interface AlbumImage {
  id: string;
  albumId: string;
  imageUrl: string;
  uploadedBy: string;
  createdAt: string;
}
