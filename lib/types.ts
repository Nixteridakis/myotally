export interface Exercise {
  id: string;
  name: string;
  /** Muscle-group names, resolved from Notion relations. */
  primary: string[];
  secondary: string[];
  tertiary: string[];
  movement: string | null;
  mechanics: string | null;
}

export interface MuscleGroup {
  id: string;
  name: string;
}

export interface NotionData {
  exercises: Exercise[];
  muscles: MuscleGroup[];
  /** ISO timestamp of when this snapshot was fetched from Notion. */
  fetchedAt: string;
}

/** One exercise placed in a session, with how many sets are planned for it. */
export interface SessionExercise {
  exerciseId: string;
  sets: number;
}

/** A training session the user assembles in the app. */
export interface Session {
  id: string;
  name: string;
  /** One entry per exercise in this session (no duplicates — use `sets` instead). */
  items: SessionExercise[];
}
