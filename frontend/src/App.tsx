import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DatasetList from '@/pages/datasets/DatasetList'
import DatasetDetail from '@/pages/datasets/DatasetDetail'
import ActionsPage from '@/pages/actions/ActionsPage'
import StrategiesPage from '@/pages/strategies/StrategiesPage'
import LineagePage from '@/pages/lineage/LineagePage'
import GraphPage from '@/pages/graph/GraphPage'
import DomainsPage from '@/pages/domains/DomainsPage'
import SearchPage from '@/pages/search/SearchPage'
import ChatBIPage from '@/pages/explore/ChatBIPage'
import DashboardPage from '@/pages/explore/DashboardPage'
import QueryBuilderPage from '@/pages/explore/QueryBuilderPage'
import EventsPage from '@/pages/events/EventsPage'
import ImpactReportPage from '@/pages/events/ImpactReportPage'
import StrategyAttributionPage from '@/pages/events/StrategyAttributionPage'
import OntTypesPage from '@/pages/ontology/OntTypesPage'
import PlatformsPage from '@/pages/ontology/PlatformsPage'
import LinkTypesPage from '@/pages/ontology/LinkTypesPage'
import ContainersPage from '@/pages/ontology/ContainersPage'
import StrategyTypesPage from '@/pages/ontology/StrategyTypesPage'
import DimensionsPage from '@/pages/ontology/DimensionsPage'
import PhysicalStructurePage from '@/pages/ontology/PhysicalStructurePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/datasets" replace />} />
        {/* 数据地图 */}
        <Route path="/datasets" element={<DatasetList />} />
        <Route path="/datasets/:id" element={<DatasetDetail />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/graph"      element={<GraphPage />} />
        <Route path="/graph/:urn" element={<GraphPage />} />
        <Route path="/lineage" element={<Navigate to="/graph" replace />} />
        <Route path="/lineage/:urn" element={<LineagePage />} />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/search" element={<SearchPage />} />
        {/* 运营分析 */}
        <Route path="/events"          element={<EventsPage />} />
        <Route path="/events/strategy" element={<StrategyAttributionPage />} />
        <Route path="/ontology/types" element={<OntTypesPage />} />
        <Route path="/ontology/dimensions" element={<DimensionsPage />} />
        <Route path="/ontology/physical" element={<PhysicalStructurePage />} />
        <Route path="/ontology/platforms" element={<PlatformsPage />} />
        <Route path="/ontology/strategy-types" element={<StrategyTypesPage />} />
        <Route path="/ontology/link-types" element={<LinkTypesPage />} />
        <Route path="/ontology/containers" element={<ContainersPage />} />
        {/* 数据探索 */}
        <Route path="/explore/chat" element={<ChatBIPage />} />
        <Route path="/explore/query" element={<QueryBuilderPage />} />
        <Route path="/explore/dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}

