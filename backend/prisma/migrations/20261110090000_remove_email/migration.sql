-- Remove o envio de e-mails: verificação de endereço, recuperação de senha e fila de mensagens.
-- DropForeignKey
ALTER TABLE "AuthToken" DROP CONSTRAINT "AuthToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmailMessage" DROP CONSTRAINT "EmailMessage_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";

-- DropTable
DROP TABLE "AuthToken";

-- DropTable
DROP TABLE "EmailMessage";

-- DropEnum
DROP TYPE "TokenType";

-- DropEnum
DROP TYPE "EmailKind";

-- DropEnum
DROP TYPE "EmailStatus";
