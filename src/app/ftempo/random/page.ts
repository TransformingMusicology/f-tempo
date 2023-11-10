import { redirect } from 'next/navigation'
import {searchRandomId} from "@/services/search";

export const dynamic = 'force-dynamic';

export default async function Page() {
    const now = new Date().getTime();
    const randomPage = await searchRandomId(now.toString());

    redirect(`/ftempo/${randomPage.library}/${randomPage.book}/${randomPage.siglum}`);
}
