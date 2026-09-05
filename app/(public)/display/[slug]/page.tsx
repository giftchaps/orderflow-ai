import { KitchenDisplay } from "@/components/kds/kitchen-display"
import { fetchBusiness } from "@/lib/business"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function DisplayPage({ params }: Props) {
  const { slug } = await params
  const business = await fetchBusiness({ slug })

  return <KitchenDisplay slug={slug} themeColor={business?.theme_color ?? null} />
}
