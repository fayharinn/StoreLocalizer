import useGooglePlayConnect from '@/hooks/useGooglePlayConnect'
import HeroSection from './HeroSection'
import ConnectionCard from './ConnectionCard'
import AppSelectionCard from './AppSelectionCard'
import ListingsCard from './ListingsCard'
import ImagesCard from './ImagesCard'
import TranslationCard from './TranslationCard'
import ActivityLogCard from './ActivityLogCard'
import EditListingDialog from './EditListingDialog'
import FullscreenImageViewer from './FullscreenImageViewer'

export default function GooglePlayConnect({ credentials, onCredentialsChange, aiConfig }) {
  const hook = useGooglePlayConnect({ credentials, onCredentialsChange, aiConfig })

  return (
    <div className="space-y-8">
      <HeroSection listings={hook.listings} />

      <ConnectionCard
        credentials={credentials}
        hasStoredGpKey={hook.hasStoredGpKey}
        canConnect={hook.canConnect}
        sessionTimeLeft={hook.sessionTimeLeft}
        formatTimeLeft={hook.formatTimeLeft}
        isConnecting={hook.isConnecting}
        connectionStatus={hook.connectionStatus}
        decryptPassword={hook.decryptPassword}
        setDecryptPassword={hook.setDecryptPassword}
        isDecrypting={hook.isDecrypting}
        decryptError={hook.decryptError}
        setDecryptError={hook.setDecryptError}
        handleDecryptServiceAccount={hook.handleDecryptServiceAccount}
        handleTestConnection={hook.handleTestConnection}
      />

      {(hook.connectionStatus?.success || hook.hasCachedSession) && (
        <AppSelectionCard
          packageName={hook.packageName}
          setPackageName={hook.setPackageName}
          editId={hook.editId}
          isCreatingEdit={hook.isCreatingEdit}
          developerUrl={hook.developerUrl}
          setDeveloperUrl={hook.setDeveloperUrl}
          developerApps={hook.developerApps}
          isLoadingDevApps={hook.isLoadingDevApps}
          handleCreateEdit={hook.handleCreateEdit}
          handleFetchDeveloperApps={hook.handleFetchDeveloperApps}
          handleSelectDeveloperApp={hook.handleSelectDeveloperApp}
          handleCommitEdit={hook.handleCommitEdit}
          handleDiscardEdit={hook.handleDiscardEdit}
        />
      )}

      {hook.listings.length > 0 && (
        <ListingsCard
          listings={hook.listings}
          isLoadingListings={hook.isLoadingListings}
          loadListings={hook.loadListings}
          handleEditListing={hook.handleEditListing}
        />
      )}

      {hook.listings.length > 0 && (
        <ImagesCard
          existingLocales={hook.existingLocales}
          selectedImageLocale={hook.selectedImageLocale}
          setSelectedImageLocale={hook.setSelectedImageLocale}
          selectedImageType={hook.selectedImageType}
          setSelectedImageType={hook.setSelectedImageType}
          images={hook.images}
          setImages={hook.setImages}
          isLoadingImages={hook.isLoadingImages}
          isUploadingImage={hook.isUploadingImage}
          loadImages={hook.loadImages}
          handleImageUpload={hook.handleImageUpload}
          handleDeleteImage={hook.handleDeleteImage}
          handleDeleteAllImages={hook.handleDeleteAllImages}
          setFullscreenImage={hook.setFullscreenImage}
        />
      )}

      {hook.listings.length > 0 && (
        <TranslationCard
          existingLocales={hook.existingLocales}
          sourceLocale={hook.sourceLocale}
          setSourceLocale={hook.setSourceLocale}
          targetLocales={hook.targetLocales}
          setTargetLocales={hook.setTargetLocales}
          fieldsToTranslate={hook.fieldsToTranslate}
          isTranslating={hook.isTranslating}
          translationProgress={hook.translationProgress}
          translationAlert={hook.translationAlert}
          availableTargetLocales={hook.availableTargetLocales}
          currentAiApiKey={hook.currentAiApiKey}
          handleLocaleToggle={hook.handleLocaleToggle}
          handleFieldToggle={hook.handleFieldToggle}
          handleTranslate={hook.handleTranslate}
        />
      )}

      <ActivityLogCard logs={hook.logs} />

      <EditListingDialog
        editDialog={hook.editDialog}
        setEditDialog={hook.setEditDialog}
        handleSaveEdit={hook.handleSaveEdit}
      />

      <FullscreenImageViewer
        fullscreenImage={hook.fullscreenImage}
        setFullscreenImage={hook.setFullscreenImage}
      />
    </div>
  )
}
