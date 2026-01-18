export interface ExerciseInfo {
  id: string;
  name: string;
  category: "PUSH" | "PULL" | "LEGS" | "CORE" | "CARDIO";
  imageUrl: string;
}

export const MOCK_EXERCISES: ExerciseInfo[] = [
  {
    id: "ex_1",
    name: "Bench Press",
    category: "PUSH",
    imageUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmVuY2glMjBwcmVzc3xlbnwwfHwwfHx8MA%3D%3D"
  },
  {
    id: "ex_2",
    name: "Incline Dumbbell Press",
    category: "PUSH",
    imageUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmVuY2glMjBwcmVzc3xlbnwwfHwwfHx8MA%3D%3D"
  },
  {
    id: "ex_3",
    name: "Pull Ups",
    category: "PULL",
    imageUrl:
      "https://images.unsplash.com/photo-1598971639058-211a742e77c9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cHVsbCUyMHVwc3xlbnwwfHwwfHx8MA%3D%3D"
  },
  {
    id: "ex_4",
    name: "Barbell Row",
    category: "PULL",
    imageUrl:
      "https://images.unsplash.com/photo-1598971639058-211a742e77c9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cHVsbCUyMHVwc3xlbnwwfHwwfHx8MA%3D%3D"
  },
  {
    id: "ex_5",
    name: "Squat",
    category: "LEGS",
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1679841208630-f5651c64ec4a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c3F1YXR8ZW58MHx8MHx8fDA%3D"
  },
  {
    id: "ex_6",
    name: "Leg Extension",
    category: "LEGS",
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1679841208630-f5651c64ec4a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c3F1YXR8ZW58MHx8MHx8fDA%3D"
  }
];
