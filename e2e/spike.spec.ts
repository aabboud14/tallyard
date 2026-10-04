import { test, expect, open } from './helpers'
import ExcelJS from 'exceljs'
import { readFileSync } from 'node:fs'
import path from 'node:path'

test('spike: routes, fonts, persisted store, workbook download, photo through canvas', async ({ page, entry }) => {
  await open(page, entry)
  await expect(page.getByTestId('fonts')).toHaveText('Fonts: loaded')
  await page.getByRole('button', { name: 'Bump' }).click()
  await page.getByRole('button', { name: 'Bump' }).click()
  await expect(page.getByTestId('count')).toHaveText('2')
  await page.getByRole('link', { name: 'Second page' }).click()
  await expect(page.getByRole('heading', { name: 'Second' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Second' })).toBeVisible()
  await expect(page.getByTestId('count')).toHaveText('2')
  await page.getByRole('link', { name: 'Home' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download workbook' }).click()
  const download = await downloadPromise
  const file = path.join(test.info().outputDir, 'spike.xlsx')
  await download.saveAs(file)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const cell = wb.getWorksheet('Sheet 1')!.getCell('A3')
  expect(cell.formula).toBe('A1+A2')
  expect(cell.result).toBe(5)

  const fixture = path.resolve('e2e/fixtures/sample-photo.jpg')
  expect(readFileSync(fixture).includes(Buffer.from([0xff, 0xe1]))).toBe(true)
  await page.getByTestId('photo').setInputFiles(fixture)
  await expect(page.getByTestId('stored-photo')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('stored-photo')).toBeVisible()
  const hasExif = await page.evaluate(async () => {
    const img = document.querySelector('[data-testid="stored-photo"]') as HTMLImageElement
    const blob = await (await fetch(img.src)).blob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    for (let i = 0; i < bytes.length - 1; i++) if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) return true
    return false
  })
  expect(hasExif).toBe(false)
})
