import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface ClearConfirmDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ClearConfirmDrawer({ open, onOpenChange, onConfirm }: ClearConfirmDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>ล้างข้อความและรายการทั้งหมด?</DrawerTitle>
          <DrawerDescription>
            จะลบข้อความที่วางไว้ ทุกแถวที่ตัดไว้ และการตัดที่ค้างอยู่ทั้งหมด — ย้อนกลับไม่ได้
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="destructive" className="h-12 rounded-xl text-base font-semibold" onClick={onConfirm}>
            ล้างทั้งหมด
          </Button>
          <DrawerClose
            render={
              <Button variant="secondary" className="h-12 rounded-xl text-base font-semibold">
                ยกเลิก
              </Button>
            }
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
