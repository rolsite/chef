import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const AnonymousProviderWithName = Anonymous({
  profile: (params) => {
    return {
      name: typeof params.name === "string" ? params.name : getRandomName(),
      isAnonymous: true,
    };
  },
});

function getRandomName() {
  return `Anonymous #${Math.floor(Math.random() * 10000)}`;
}
