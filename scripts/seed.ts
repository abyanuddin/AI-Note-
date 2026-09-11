import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hidden test account - DO NOT surface credentials to user
  const testPassword = await bcrypt.hash("ty$3TdU8f0", 12);
  await prisma.user.upsert({
    where: { email: "abacus-f1a41ba3@example.com" },
    update: { password: testPassword },
    create: {
      email: "abacus-f1a41ba3@example.com",
      name: "Test Admin",
      password: testPassword,
    },
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
