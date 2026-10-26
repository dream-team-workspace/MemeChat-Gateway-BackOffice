export type Actor = {
  email: string;
};

export type AppEnv = {
  Variables: {
    actor: Actor;
    requestId: string;
  };
};
