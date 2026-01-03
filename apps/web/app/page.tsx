import { Button } from "@workspace/ui/components/button";
import { auth, signOut } from "@/auth";

export default async function Page() {
  const session = await auth();

  return (
    <div>
      {JSON.stringify(session?.user)}
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <Button type="submit">Sign Out</Button>
      </form>
    </div>
  );
}
