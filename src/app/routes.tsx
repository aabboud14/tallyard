import { createHashRouter } from 'react-router'
import { Layout } from '../components/shell/Layout'
import { Landing } from '../features/shared/Landing'
import { Inventory } from '../features/supply/Inventory'
import { ItemDetail } from '../features/supply/ItemDetail'
import { Capture } from '../features/supply/Capture'
import { Priority } from '../features/supply/Priority'
import { Listings } from '../features/supply/Listings'
import { Offers } from '../features/supply/Offers'
import { Browse } from '../features/market/Browse'
import { Listing } from '../features/market/Listing'
import { Match } from '../features/project/Match'
import { Plan } from '../features/project/Plan'
import { Deals } from '../features/project/Deals'
import { ProjectCompliance } from '../features/compliance/ProjectCompliance'
import { Waste } from '../features/compliance/Waste'
import { Ledger } from '../features/operator/Ledger'
import { Models } from '../features/operator/Models'
import { Assumptions } from '../features/shared/Assumptions'
import { About } from '../features/shared/About'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'supply/inventory', element: <Inventory /> },
      { path: 'supply/inventory/:itemId', element: <ItemDetail /> },
      { path: 'supply/capture', element: <Capture /> },
      { path: 'supply/priority', element: <Priority /> },
      { path: 'supply/listings', element: <Listings /> },
      { path: 'supply/offers', element: <Offers /> },
      { path: 'market', element: <Browse /> },
      { path: 'market/:publicId', element: <Listing /> },
      { path: 'project/match', element: <Match /> },
      { path: 'project/plan', element: <Plan /> },
      { path: 'project/plan/:planItemId', element: <Plan /> },
      { path: 'project/deals', element: <Deals /> },
      { path: 'compliance/project', element: <ProjectCompliance /> },
      { path: 'compliance/waste', element: <Waste /> },
      { path: 'operator/ledger', element: <Ledger /> },
      { path: 'operator/models', element: <Models /> },
      { path: 'assumptions', element: <Assumptions /> },
      { path: 'about', element: <About /> },
    ],
  },
])
