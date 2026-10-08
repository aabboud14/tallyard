// Version 1.0 hash routes (brief/09-V1-PRODUCT.md section 4). Routes carry opaque IDs only, never names.
// Each screen's file and export name is fixed here; Gate checks the role and canAccess before a screen renders.
import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { Layout } from '../components/shell/Layout'
import { Gate } from '../components/shell/Gate'
import { NotFound } from '../components/shell/NotFound'
import { Landing } from '../features/shared/Landing'
import { ProjectHome } from '../features/shared/ProjectHome'
import { MatchRoute } from '../features/shared/MatchRoute'
import { Browse } from '../features/architect/Browse'
import { Shared } from '../features/architect/Shared'
import { Saved } from '../features/architect/Saved'
import { NewProject } from '../features/architect/NewProject'
import { Wishlist } from '../features/architect/Wishlist'
import { SpecSheet } from '../features/architect/SpecSheet'
import { Approvals } from '../features/client/Approvals'
import { Listing } from '../features/market/Listing'
import { Plan } from '../features/project/Plan'
import { Deals } from '../features/project/Deals'
import { ProjectCompliance } from '../features/compliance/ProjectCompliance'
import { WishlistReview } from '../features/compliance/WishlistReview'
import { Waste } from '../features/compliance/Waste'
import { Inventory } from '../features/supply/Inventory'
import { ItemDetail } from '../features/supply/ItemDetail'
import { Capture } from '../features/supply/Capture'
import { Priority } from '../features/supply/Priority'
import { Listings } from '../features/supply/Listings'
import { Offers } from '../features/supply/Offers'
import { Ledger } from '../features/operator/Ledger'
import { Models } from '../features/operator/Models'
import { Assumptions } from '../features/shared/Assumptions'
import { About } from '../features/shared/About'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      // Marketplace: browse and a listing are open to every role; the rest is the architect's.
      { path: 'market', element: <Browse /> },
      {
        element: <Gate roles={['architect']} />,
        children: [
          { path: 'market/shared', element: <Shared /> },
          { path: 'saved', element: <Saved /> },
          { path: 'projects/new', element: <NewProject /> },
        ],
      },
      { path: 'market/:publicId', element: <Listing /> },
      // Projects: architect, buying owner (client) and consultant, each only on their own projects.
      {
        path: 'projects/:projectId',
        element: <Gate roles={['architect', 'client', 'consultant']} target="project" />,
        children: [
          { index: true, element: <ProjectHome /> },
          { path: 'match', element: <Gate roles={['architect', 'client']} />, children: [{ index: true, element: <MatchRoute /> }] },
          {
            element: <Gate roles={['architect']} />,
            children: [
              { path: 'wishlist', element: <Wishlist /> },
              { path: 'spec', element: <SpecSheet /> },
            ],
          },
          {
            element: <Gate roles={['client']} />,
            children: [
              { path: 'approvals', element: <Approvals /> },
              { path: 'plan', element: <Plan /> },
              { path: 'plan/:planItemId', element: <Plan /> },
              { path: 'deals', element: <Deals /> },
            ],
          },
          {
            element: <Gate roles={['consultant']} />,
            children: [
              { path: 'compliance', element: <ProjectCompliance /> },
              { path: 'review', element: <WishlistReview /> },
            ],
          },
        ],
      },
      // Buildings: the surveyor and the selling owner, each only on the buildings they survey or own.
      {
        path: 'buildings/:buildingId',
        element: <Gate roles={['surveyor', 'seller']} target="building" />,
        children: [
          { index: true, element: <Navigate to="inventory" replace /> },
          { path: 'inventory', element: <Inventory /> },
          { path: 'inventory/:itemId', element: <ItemDetail /> },
          { path: 'capture', element: <Capture /> },
          {
            element: <Gate roles={['seller']} />,
            children: [
              { path: 'priority', element: <Priority /> },
              { path: 'listings', element: <Listings /> },
            ],
          },
        ],
      },
      { path: 'offers', element: <Gate roles={['seller']} />, children: [{ index: true, element: <Offers /> }] },
      { path: 'engagements/:engagementId', element: <Gate roles={['consultant']} target="engagement" />, children: [{ index: true, element: <Navigate to="waste" replace /> }, { path: 'waste', element: <Waste /> }] },
      { path: 'operator/ledger', element: <Ledger /> },
      { path: 'operator/models', element: <Models /> },
      { path: 'assumptions', element: <Assumptions /> },
      { path: 'about', element: <About /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const router = createHashRouter(routes)
