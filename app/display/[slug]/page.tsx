import { KitchenDisplay } from "@/components/kds/kitchen-display"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function DisplayPage({ params }: Props) {
  await params

  return <KitchenDisplay />
}
