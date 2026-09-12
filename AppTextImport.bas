Attribute VB_Name = "AppTextImport"
Option Explicit

Public Sub AppTextAusXMLImportieren()
    Dim fd As FileDialog
    Dim path As String
    Dim xml As Object
    Dim rootNode As Object
    Dim exportVersion As String
    Dim missingTags As String
    Dim imported As Boolean

    On Error GoTo ImportError

    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = "Exportdatei aus der App auswählen"
        .AllowMultiSelect = False
        .Filters.Clear
        .Filters.Add "App-Export (XML)", "*.xml"
        If .Show <> -1 Then Exit Sub
        path = .SelectedItems(1)
    End With

    Set xml = CreateObject("MSXML2.DOMDocument.6.0")
    xml.async = False
    xml.validateOnParse = False

    If Not xml.Load(path) Then
        MsgBox "Die XML-Datei konnte nicht gelesen werden:" & vbCrLf & _
            xml.parseError.reason, vbExclamation
        Exit Sub
    End If

    Set rootNode = xml.SelectSingleNode("/appExport")
    If rootNode Is Nothing Then
        MsgBox "Die XML-Datei enthält kein <appExport>-Element.", vbExclamation
        Exit Sub
    End If

    exportVersion = GetAttributeText(rootNode, "version")
    If Len(exportVersion) = 0 Then
        MsgBox "Die XML-Datei enthält keine appExport-Version.", vbExclamation
        Exit Sub
    End If

    Select Case exportVersion
        Case "1.0"
            imported = ImportVersion1(xml, missingTags)
        Case "2.0"
            imported = ImportVersion2(xml, missingTags)
        Case Else
            MsgBox "Die XML-Version '" & exportVersion & _
                "' wird nicht unterstützt. Unterstützt werden 1.0 und 2.0.", _
                vbExclamation
            Exit Sub
    End Select

    If Not imported Then Exit Sub

    If Len(missingTags) > 0 Then
        MsgBox "Der Import wurde abgeschlossen. Folgende Word-Felder wurden " & _
            "nicht gefunden:" & vbCrLf & missingTags, vbExclamation
    Else
        MsgBox "App-Text wurde in die Word-Vorlage übernommen.", vbInformation
    End If
    Exit Sub

ImportError:
    MsgBox "Der App-Text konnte nicht importiert werden:" & vbCrLf & _
        Err.Description, vbExclamation
End Sub

Private Function ImportVersion1(ByVal xml As Object, _
                                ByRef missingTags As String) As Boolean
    Dim nodes As Object
    Dim node As Object
    Dim sectionId As String
    Dim sectionText As String
    Dim cc As ContentControl

    Set nodes = xml.SelectNodes("/appExport/section")
    If nodes.Length = 0 Then
        MsgBox "Die XML-Datei enthält keine <section>-Bereiche.", vbExclamation
        Exit Function
    End If

    For Each node In nodes
        sectionId = GetAttributeText(node, "id")
        If Len(sectionId) = 0 Then
            Debug.Print "XML v1: Section ohne id wurde übersprungen."
        Else
            sectionText = node.Text
            sectionText = Replace(sectionText, vbCrLf, vbLf)
            sectionText = Replace(sectionText, vbLf, vbCr)

            Set cc = FindContentControlByTag(sectionId)
            If cc Is Nothing Then
                AddMissingTag missingTags, sectionId
                Debug.Print "Kein Word-Feld gefunden für: " & sectionId
            Else
                cc.Range.Text = sectionText
            End If
        End If
    Next node

    ImportVersion1 = True
End Function

Private Function ImportVersion2(ByVal xml As Object, _
                                ByRef missingTags As String) As Boolean
    Dim nodes As Object
    Dim node As Object
    Dim slotValue As String
    Dim targetTag As String
    Dim cc As ContentControl

    Set nodes = xml.SelectNodes("/appExport/section")
    If nodes.Length = 0 Then
        MsgBox "Die XML-Datei enthält keine <section>-Bereiche.", vbExclamation
        Exit Function
    End If

    For Each node In nodes
        slotValue = GetAttributeText(node, "slot")
        Select Case slotValue
            Case "1", "2", "3"
                targetTag = "APP_TEXT_" & slotValue
                Set cc = FindContentControlByTag(targetTag)
                If cc Is Nothing Then
                    AddMissingTag missingTags, targetTag
                    Debug.Print "Kein Word-Feld gefunden für: " & targetTag
                Else
                    InsertV2Section cc, node
                End If
            Case Else
                Debug.Print "XML v2: Section ohne gültigen slot wurde " & _
                    "übersprungen: " & slotValue
        End Select
    Next node

    ImportVersion2 = True
End Function

Private Function FindContentControlByTag(ByVal targetTag As String) _
                                         As ContentControl
    Dim cc As ContentControl

    For Each cc In ActiveDocument.ContentControls
        If StrComp(cc.Tag, targetTag, vbBinaryCompare) = 0 Then
            Set FindContentControlByTag = cc
            Exit Function
        End If
    Next cc
End Function

Private Sub InsertV2Section(ByVal cc As ContentControl, _
                            ByVal sectionNode As Object)
    Dim items As Object
    Dim itemNode As Object
    Dim itemType As String
    Dim renderedText As String
    Dim sectionText As String
    Dim itemRange As Range
    Dim insertionPosition As Long
    Dim visibleItemCount As Long
    Dim pendingSpacingBefore As Boolean
    Dim previousItemIsCompact As Boolean

    Set items = sectionNode.SelectNodes("./item")

    For Each itemNode In items
        itemType = NormalizeItemType(GetAttributeText(itemNode, "type"))
        renderedText = BuildRenderedItemText(itemNode, itemType)
        If Len(renderedText) > 0 Then
            If visibleItemCount > 0 Then sectionText = sectionText & vbCr
            sectionText = sectionText & renderedText
            visibleItemCount = visibleItemCount + 1
        End If
    Next itemNode

    cc.Range.Text = sectionText
    If visibleItemCount = 0 Then Exit Sub

    insertionPosition = cc.Range.Start
    visibleItemCount = 0

    For Each itemNode In items
        itemType = NormalizeItemType(GetAttributeText(itemNode, "type"))

        If IsSpacingOnlyHeading(itemNode, itemType) Then
            pendingSpacingBefore = True
        Else
            renderedText = BuildRenderedItemText(itemNode, itemType)
            If Len(renderedText) > 0 Then
                If visibleItemCount > 0 Then insertionPosition = insertionPosition + 1

                Set itemRange = ActiveDocument.Range( _
                    Start:=insertionPosition, _
                    End:=insertionPosition + Len(renderedText))

                ApplyItemFormatting itemRange, itemNode, itemType, _
                    pendingSpacingBefore, previousItemIsCompact

                insertionPosition = insertionPosition + Len(renderedText)
                visibleItemCount = visibleItemCount + 1
                pendingSpacingBefore = False
                previousItemIsCompact = IsCompactItem(itemNode, itemType)
            End If
        End If
    Next itemNode
End Sub

Private Sub ApplyItemFormatting(ByVal itemRange As Range, _
                                ByVal itemNode As Object, _
                                ByVal itemType As String, _
                                ByVal addSpacingBefore As Boolean, _
                                ByVal previousItemIsCompact As Boolean)
    Dim headingLevel As Long
    Dim labelRange As Range
    Dim compactContext As Boolean

    itemRange.Font.Bold = False
    itemRange.Font.Italic = False
    itemRange.ParagraphFormat.LeftIndent = 0

    Select Case itemType
        Case "heading"
            headingLevel = GetHeadingLevel(itemNode)
            itemRange.Font.Bold = True
            If headingLevel = 2 Then
                itemRange.Font.Size = 10
                itemRange.ParagraphFormat.LineSpacingRule = wdLineSpaceSingle
                itemRange.ParagraphFormat.LeftIndent = _
                    Application.CentimetersToPoints(0.5)
                itemRange.ParagraphFormat.SpaceBefore = 2
                itemRange.ParagraphFormat.SpaceAfter = 1
            Else
                itemRange.Font.Size = 11
                SetNormalLineSpacing itemRange
                itemRange.ParagraphFormat.SpaceBefore = 6
                itemRange.ParagraphFormat.SpaceAfter = 3
            End If

        Case "freeText"
            compactContext = previousItemIsCompact
            If compactContext Then
                itemRange.Font.Size = 10
                itemRange.ParagraphFormat.LineSpacingRule = wdLineSpaceSingle
                itemRange.ParagraphFormat.LeftIndent = _
                    Application.CentimetersToPoints(0.5)
            Else
                itemRange.Font.Size = 11
                SetNormalLineSpacing itemRange
            End If
            itemRange.ParagraphFormat.SpaceBefore = 2
            itemRange.ParagraphFormat.SpaceAfter = 1

            Set labelRange = ActiveDocument.Range( _
                Start:=itemRange.Start, _
                End:=itemRange.Start + Len("Hinweis:"))
            labelRange.Font.Bold = True
            labelRange.Font.Italic = False

        Case "measurement", "status", "listItem"
            itemRange.Font.Size = 10
            itemRange.ParagraphFormat.LineSpacingRule = wdLineSpaceSingle
            itemRange.ParagraphFormat.SpaceBefore = 0
            itemRange.ParagraphFormat.SpaceAfter = 1
            itemRange.ParagraphFormat.LeftIndent = _
                Application.CentimetersToPoints(0.5)

        Case Else
            itemRange.Font.Size = 11
            SetNormalLineSpacing itemRange
            itemRange.ParagraphFormat.SpaceBefore = 0
            itemRange.ParagraphFormat.SpaceAfter = 2
    End Select

    If addSpacingBefore And itemRange.ParagraphFormat.SpaceBefore < 6 Then
        itemRange.ParagraphFormat.SpaceBefore = 6
    End If
End Sub

Private Function IsCompactItem(ByVal itemNode As Object, _
                               ByVal itemType As String) As Boolean
    If itemType = "measurement" Or itemType = "status" Or _
       itemType = "listItem" Then
        IsCompactItem = True
    ElseIf itemType = "heading" Then
        IsCompactItem = (GetHeadingLevel(itemNode) = 2)
    End If
End Function

Private Function NormalizeItemType(ByVal itemType As String) As String
    Select Case itemType
        Case "heading", "bodyText", "freeText", "measurement", _
             "status", "listItem"
            NormalizeItemType = itemType
        Case Else
            NormalizeItemType = "bodyText"
    End Select
End Function

Private Function BuildRenderedItemText(ByVal itemNode As Object, _
                                       ByVal itemType As String) As String
    Dim itemText As String

    If IsSpacingOnlyHeading(itemNode, itemType) Then Exit Function

    itemText = NormalizeWordLineBreaks(itemNode.Text)
    If Len(itemText) = 0 Then Exit Function

    If itemType = "freeText" Then
        BuildRenderedItemText = "Hinweis: " & itemText
    Else
        BuildRenderedItemText = itemText
    End If
End Function

Private Function GetHeadingLevel(ByVal itemNode As Object) As Long
    If GetAttributeText(itemNode, "level") = "2" Then
        GetHeadingLevel = 2
    Else
        GetHeadingLevel = 1
    End If
End Function

Private Function IsSpacingOnlyHeading(ByVal itemNode As Object, _
                                      ByVal itemType As String) As Boolean
    IsSpacingOnlyHeading = (itemType = "heading" And _
        GetAttributeText(itemNode, "visibility") = "spacingOnly")
End Function

Private Sub SetNormalLineSpacing(ByVal itemRange As Range)
    itemRange.ParagraphFormat.LineSpacingRule = wdLineSpaceMultiple
    itemRange.ParagraphFormat.LineSpacing = Application.LinesToPoints(1.1)
End Sub

Private Function GetAttributeText(ByVal node As Object, _
                                  ByVal attributeName As String) As String
    Dim attributeNode As Object

    Set attributeNode = node.SelectSingleNode("@" & attributeName)
    If attributeNode Is Nothing Then
        GetAttributeText = vbNullString
    Else
        GetAttributeText = CStr(attributeNode.Text)
    End If
End Function

Private Function NormalizeWordLineBreaks(ByVal value As String) As String
    value = Replace(value, vbCrLf, vbLf)
    value = Replace(value, vbCr, vbLf)
    NormalizeWordLineBreaks = Replace(value, vbLf, vbCr)
End Function

Private Sub AddMissingTag(ByRef missingTags As String, _
                          ByVal targetTag As String)
    Dim marker As String

    marker = vbCrLf & missingTags & vbCrLf
    If InStr(1, marker, vbCrLf & targetTag & vbCrLf, vbBinaryCompare) > 0 Then
        Exit Sub
    End If

    If Len(missingTags) > 0 Then missingTags = missingTags & vbCrLf
    missingTags = missingTags & targetTag
End Sub
