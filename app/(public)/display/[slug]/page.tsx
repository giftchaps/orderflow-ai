import { KitchenDisplay } from "@/components/kds/kitchen-display"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function DisplayPage({ params }: Props) {
  const { slug } = await params

  return <KitchenDisplay slug={slug} />
}
