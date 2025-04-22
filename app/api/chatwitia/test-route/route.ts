import { NextResponse } from 'next/server';

export async function GET() {
  console.log('API: Test route accessed');
  
  return NextResponse.json({
    status: 'ok',
    message: 'Test route is working properly!',
    timestamp: new Date().toISOString()
  });
} 